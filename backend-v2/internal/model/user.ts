import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
} from 'typeorm';

@Entity('users')
export default class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    avatar: string;

    @ManyToMany(() => User, (user) => user.followings)
    followers: User[];

    @ManyToMany(() => User, (user) => user.followers)
    followings: User[];

    @Column({ type: 'json', nullable: true })
    lists: Array<{ name: string; posts: string[]; images: string[] }>;

    @Column({ type: 'simple-array', nullable: true })
    interests: string[];

    @Column({ type: 'simple-array', nullable: true })
    ignore: string[];

    @Column({ type: 'simple-array', nullable: true })
    mutedAuthor: string[];

    @Column({ type: 'json', nullable: true })
    notifications: Array<{
        userId: string;
        username: string;
        avatar?: string;
        message: string;
        postId?: string;
        postTitle?: string;
        read: boolean;
        createdAt: Date;
    }>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
